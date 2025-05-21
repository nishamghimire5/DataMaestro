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
  SpellCheck, // Icon for English Correction
  FileText, // Icon for Documentation/README
} from 'lucide-react';
import DataAnomalyDetection, { type AnomalyWithStatus } from '@/components/data-anomaly-detection';
import DataStandardization, { type StandardizationResult } from '@/components/data-standardization';
import CsvProcessing from '@/components/csv-processing';
import DataProfiling from '@/components/data-profiling'; // Import new component
import EvaluationDashboard from '@/components/evaluation-dashboard'; // Import new component
import IssueLog from '@/components/issue-log'; // Import new component
import EnglishCorrection from '@/components/english-correction'; // Import new component
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
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <DatabaseZap className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">DataMaestro</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2 flex-grow overflow-y-auto">          <SidebarGroup>
            <SidebarGroupLabel>Core Features</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <a href="#csv-processing">
                  <SidebarMenuButton tooltip="CSV Processing">
                    <TableProperties />
                    <span>CSV Processing</span>
                  </SidebarMenuButton>
                </a>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <a href="#english-correction">
                  <SidebarMenuButton tooltip="English Correction">
                    <SpellCheck />
                    <span>English Correction</span>
                  </SidebarMenuButton>
                </a>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <a href="#anomaly-detection">
                  <SidebarMenuButton tooltip="Anomaly Detection">
                    <ScanSearch />
                    <span>Anomaly Detection</span>
                  </SidebarMenuButton>
                </a>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <a href="#standardization">
                  <SidebarMenuButton tooltip="Data Standardization">
                    <FileCheck2 />
                    <span>Data Standardization</span>
                  </SidebarMenuButton>
                </a>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <a href="#profiling">
                  <SidebarMenuButton tooltip="Data Profiling">
                    <ClipboardList />
                    <span>Data Profiling</span>
                  </SidebarMenuButton>
                </a>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>          <SidebarGroup>
             <SidebarGroupLabel>Evaluation &amp; Analysis</SidebarGroupLabel>
             <SidebarMenu>
                <SidebarMenuItem>
                  <a href="#evaluation">
                    <SidebarMenuButton tooltip="Evaluation Dashboard">
                      <Target />
                      <span>Evaluation</span>
                    </SidebarMenuButton>
                  </a>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <a href="#issue-log">
                    <SidebarMenuButton tooltip="Issue Log">
                      <ListX />
                      <span>Issue Log</span>
                    </SidebarMenuButton>
                  </a>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarGroup>
          
          <SidebarGroup>
             <SidebarGroupLabel>Documentation</SidebarGroupLabel>
             <SidebarMenu>                <SidebarMenuItem>
                  <a href="https://github.com/nishamghimire5/DataMaestro?tab=readme-ov-file#datamaestro---ai-powered-csv-processing-with-sql-suggestion-and-command-modes" target="_blank" rel="noopener noreferrer">
                    <SidebarMenuButton tooltip="View Complete Documentation">
                      <FileText />
                      <span>README</span>
                    </SidebarMenuButton>
                  </a>
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
              <span className="text-sm font-medium">TheNisham</span>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>      <SidebarInset className="flex flex-col">        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-2 sm:px-4 border-b bg-background">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <SidebarTrigger />
            <h2 className="text-base sm:text-lg font-semibold overflow-hidden text-ellipsis whitespace-nowrap">LLM-Powered Data Enhancement</h2>
          </div>
          <div className="hidden sm:block">
            <select className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 text-muted-foreground cursor-pointer">
              <option value="csv">CSV Processing</option>
              <option value="english">English Correction</option>
              <option value="anomaly">Anomaly Detection</option>
              <option value="standard">Standardization</option>
            </select>
          </div>
        </header><main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8"> {/* Responsive spacing */}          <Card id="csv-processing">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                 <TableProperties className="w-5 h-5 text-primary" />
                CSV Data Processing
              </CardTitle>
              <p className="text-xs text-muted-foreground">Hybrid processing (Suggestion mode: AI, SQL mode: Custom parser with AI fallback, Command mode: AI)</p>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 overflow-x-auto">
              <CsvProcessing />
            </CardContent>
          </Card>          <Card id="english-correction">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <SpellCheck className="w-5 h-5 text-primary" />
                English Language Correction
              </CardTitle>
              <p className="text-xs text-muted-foreground">Powered by Gemini</p>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 overflow-x-auto">
              <EnglishCorrection />
            </CardContent>
          </Card>          <Card id="anomaly-detection">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <ScanSearch className="w-5 h-5 text-primary" />
                Data Anomaly Detection
              </CardTitle>
              <p className="text-xs text-muted-foreground">Processed with AI</p>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 overflow-x-auto">
              {/* Pass the callback function */}
              <DataAnomalyDetection onValidation={handleAnomalyValidation} />
            </CardContent>
          </Card>          <Card id="standardization">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <FileCheck2 className="w-5 h-5 text-primary" />
                Data Standardization
              </CardTitle>
              <p className="text-xs text-muted-foreground">Processed with AI</p>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 overflow-x-auto">
               {/* Pass the callback function */}
              <DataStandardization onValidation={handleStandardizationValidation} />
            </CardContent>
          </Card>          {/* New Card for Data Profiling */}
          <Card id="profiling">
             <CardHeader className="px-3 sm:px-6">
               <CardTitle className="flex items-center gap-2 flex-wrap">
                  <ClipboardList className="w-5 h-5 text-primary" />
                 Data Profiling
               </CardTitle>
               <p className="text-xs text-muted-foreground">Processed with AI</p>
             </CardHeader>
             <CardContent className="px-2 sm:px-6 overflow-x-auto">
               <DataProfiling />
             </CardContent>
          </Card>

          {/* New Card for Evaluation Dashboard */}
          <Card id="evaluation">
             <CardHeader className="px-3 sm:px-6">
               <CardTitle className="flex items-center gap-2 flex-wrap">
                  <Target className="w-5 h-5 text-primary" />
                 Evaluation Dashboard
               </CardTitle>
               <p className="text-xs text-muted-foreground">Analytics dashboard with human feedback tracking</p>
             </CardHeader>
             <CardContent className="px-2 sm:px-6 overflow-x-auto">
                {/* Pass the session stats */}
               <EvaluationDashboard stats={sessionStats} />
             </CardContent>
          </Card>

          {/* New Card for Issue Log */}
          <Card id="issue-log">
             <CardHeader className="px-3 sm:px-6">
               <CardTitle className="flex items-center gap-2 flex-wrap">
                  <ListX className="w-5 h-5 text-primary" />
                 Issue Log (Rejected Items)
               </CardTitle>
               <p className="text-xs text-muted-foreground">Human feedback tracking system</p>
             </CardHeader>
             <CardContent className="px-2 sm:px-6 overflow-x-auto">
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
