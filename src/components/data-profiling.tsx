
'use client';

import { useState } from 'react';
import { profileData, type ProfileDataOutput } from '@/ai/flows/data-profiling';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, BarChartHorizontalBig, Table, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse'; // Import PapaParse

export default function DataProfiling() {
  const [rawData, setRawData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProfileDataOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isCsv, setIsCsv] = useState(false); // State to track if input is CSV

  const handleDataChange = (value: string) => {
    setRawData(value);
    // Basic check if the data looks like CSV (contains commas and newlines)
    setIsCsv(value.includes(',') && value.includes('\n'));
  };

  const handleProfileData = async () => {
    if (!rawData.trim()) {
      setError('Please enter data to profile.');
       toast({
           title: "Input Required",
           description: "Please enter data before generating a profile.",
           variant: "destructive",
       });
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let dataToProcess = rawData;
      let format: 'json' | 'csv' = 'json'; // Default to JSON

      // Attempt to parse as JSON first
      try {
        JSON.parse(rawData);
        // If successful, it's likely JSON format
        format = 'json';
      } catch (jsonError) {
        // If JSON parsing fails, try parsing as CSV
        const parseResult = Papa.parse(rawData, { header: true, skipEmptyLines: true, dynamicTyping: true });
        if (parseResult.errors.length === 0 && parseResult.data.length > 0) {
          format = 'csv';
          // We determined it's CSV, send the raw string and the format hint
        } else {
          // If both fail, try sending as raw text (still assuming JSON format for the flow)
          console.warn("Could not definitively parse as JSON or CSV. Sending as raw text, assuming JSON structure for flow.");
          toast({
              title: "Format Warning",
              description: "Could not automatically detect format (JSON/CSV). Attempting profiling as JSON.",
              variant: "default", // use default/warning variant
          });
          format = 'json'; // Fallback to json for the flow input
        }
      }


      const output = await profileData({ data: dataToProcess, format });
      setResult(output);
       toast({
         title: "Profiling Complete",
         description: "Data profile generated successfully.",
         variant: "default", // Use 'success' if available
       });
    } catch (e) {
      console.error('Error profiling data:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during data profiling.';
      setError(errorMessage);
       toast({
         title: "Profiling Error",
         description: errorMessage,
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder='Enter raw data (JSON or CSV format) here... e.g., [{"id": 1, "value": "A"}, {"id": 2, "value": "B"}] or id,value\n1,A\n2,B'
        value={rawData}
        onChange={(e) => handleDataChange(e.target.value)}
        rows={8}
        disabled={isLoading}
        className="text-sm font-mono"
      />
      <Button onClick={handleProfileData} disabled={isLoading || !rawData.trim()}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Profiling Data...
          </>
        ) : (
           <>
             <BarChartHorizontalBig className="mr-2 h-4 w-4" />
             Generate Profile
           </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Data Profile Results</CardTitle>
             <CardDescription>{result.overallSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.fields.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">No specific field profiles generated.</p>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                    <Table className="w-4 h-4"/>
                    Field-Level Analysis ({result.fieldCount} fields):
                </h4>
                 <p className="text-xs text-muted-foreground">Total Records Analyzed: {result.recordCount}</p>
                {result.fields.map((field, index) => (
                  <Card key={index} className="bg-card border rounded-lg overflow-hidden">
                    <CardHeader className="p-4 bg-secondary/50">
                       <p className="font-semibold text-sm">
                         Field: <code className="bg-muted px-1 rounded">{field.fieldName}</code>
                       </p>
                    </CardHeader>
                    <CardContent className="p-4 text-sm space-y-2">
                      <p><strong>Inferred Type:</strong> {field.inferredType}</p>
                      <p><strong>Missing Values:</strong> {field.missingValues} ({field.missingPercentage.toFixed(2)}%)</p>
                      <p><strong>Unique Values:</strong> {field.uniqueValues}</p>
                       {/* Updated rendering for valueDistribution (array of objects) */}
                      {field.valueDistribution && field.valueDistribution.length > 0 && (
                        <div>
                          <strong>Value Distribution (Top 5):</strong>
                          <ul className="list-disc pl-5 mt-1 text-xs text-muted-foreground">
                            {field.valueDistribution
                              .sort((a, b) => b.count - a.count) // Sort by count desc
                              .slice(0, 5) // Take top 5
                              .map((item) => (
                                <li key={item.value}>{item.value}: {item.count}</li>
                              ))}
                               {field.valueDistribution.length > 5 && <li>... and more</li>}
                          </ul>
                        </div>
                      )}
                      {field.commonFormats && field.commonFormats.length > 0 && (
                        <p><strong>Common Formats:</strong> {field.commonFormats.join(', ')}</p>
                      )}
                      {field.potentialIssues && field.potentialIssues.length > 0 && (
                        <div>
                            <strong>Potential Issues:</strong>
                             <ul className="list-disc pl-5 mt-1 text-xs text-destructive/80">
                                {field.potentialIssues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                             </ul>
                        </div>
                      )}
                       {field.stats && (
                         <div>
                            <strong>Numeric Stats:</strong>
                            <ul className="list-disc pl-5 mt-1 text-xs text-muted-foreground">
                                {field.stats.min !== undefined && <li>Min: {field.stats.min}</li>}
                                {field.stats.max !== undefined && <li>Max: {field.stats.max}</li>}
                                {field.stats.mean !== undefined && <li>Mean: {field.stats.mean.toFixed(2)}</li>}
                                {field.stats.median !== undefined && <li>Median: {field.stats.median}</li>}
                                {field.stats.stddev !== undefined && <li>Std Dev: {field.stats.stddev.toFixed(2)}</li>}
                            </ul>
                         </div>
                       )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
             {result.generalObservations && result.generalObservations.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                       <FileText className="w-4 h-4"/>
                        General Observations:
                    </h4>
                     <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                        {result.generalObservations.map((obs, i) => (
                            <li key={i}>{obs}</li>
                        ))}
                     </ul>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

