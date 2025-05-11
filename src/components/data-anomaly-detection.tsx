
'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import { detectDataAnomaly, type DetectDataAnomalyOutput } from '@/ai/flows/data-anomaly-detection';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Correctly reference the element type of the 'anomalies' array
type BaseAnomaly = DetectDataAnomalyOutput['anomalies'][number];

// Define the new interface by extending the base type and adding a status
export interface AnomalyWithStatus extends BaseAnomaly {
  status: 'pending' | 'approved' | 'rejected';
}

// Define props for the component, including the callback
interface DataAnomalyDetectionProps {
  onValidation?: (anomaly: AnomalyWithStatus, processingTime: number) => void;
}

export default function DataAnomalyDetection({ onValidation }: DataAnomalyDetectionProps) {
  const [customerData, setCustomerData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectDataAnomalyOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anomaliesWithStatus, setAnomaliesWithStatus] = useState<AnomalyWithStatus[]>([]);
  const { toast } = useToast(); // Initialize toast
  const [startTime, setStartTime] = useState<number | null>(null); // State to track start time

  const handleDetectAnomaly = async () => {
    if (!customerData.trim()) {
      setError('Please enter customer data.');
      toast({ // Add toast for user feedback
          title: "Input Required",
          description: "Please enter customer data before detecting anomalies.",
          variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setError(null); // Clear previous errors before starting
    setResult(null);
    setAnomaliesWithStatus([]);
    setStartTime(Date.now()); // Record start time

    try {
      // Basic JSON validation
      JSON.parse(customerData); // This will throw an error if the JSON is invalid
      const output = await detectDataAnomaly({ customerData });
      setResult(output);
      // Initialize anomalies with 'pending' status
      setAnomaliesWithStatus(
        output.anomalies.map((anomaly) => ({ ...anomaly, status: 'pending' }))
      );
      toast({ // Success toast
        title: "Analysis Complete",
        description: `Found ${output.anomalies.length} potential anomalies. ${output.summary}`,
        variant: "default",
      });
    } catch (e) {
      console.error('Error detecting anomalies:', e);
       let errorMessage = 'An unknown error occurred during anomaly detection.';
       if (e instanceof SyntaxError) {
         // Provide a more specific error message for JSON formatting issues
         errorMessage = `Invalid JSON format: ${e.message}. Please ensure property names and string values are enclosed in double quotes.`;
       } else if (e instanceof Error) {
         errorMessage = e.message;
       }
       setError(errorMessage);
       toast({ // Error toast
           title: "Analysis Error",
           description: errorMessage,
           variant: "destructive",
       });
       // Ensure results are cleared on error
       setResult(null);
       setAnomaliesWithStatus([]);
    } finally {
      setIsLoading(false);
      setStartTime(null); // Clear start time after completion or error
    }
  };

  const handleValidation = (index: number, status: 'approved' | 'rejected') => {
    const endTime = Date.now(); // Record end time for validation action
    const processingTime = startTime ? endTime - startTime : 0; // Calculate duration, fallback to 0

    setAnomaliesWithStatus((prev) =>
      prev.map((anomaly, i) => {
        if (i === index) {
          const updatedAnomaly = { ...anomaly, status };
          // Call the callback function if provided
          if (onValidation) {
            onValidation(updatedAnomaly, processingTime);
          }
           toast({ // Toast for validation action
             title: `Anomaly ${status}`,
             description: `Field: ${updatedAnomaly.field}`,
             variant: status === 'approved' ? 'default' : 'destructive',
           });
          return updatedAnomaly;
        }
        return anomaly;
      })
    );
     // Reset start time after validation action, preparing for next potential analysis
    // setStartTime(null); // Commenting out - keep start time until next 'Detect' click
  };

  const getStatusBadgeVariant = (status: 'pending' | 'approved' | 'rejected'): "default" | "secondary" | "destructive" | "outline" => {
     switch (status) {
      case 'approved':
        // Using secondary variant for approved status (often greenish or positive)
        // Adjusted to use 'default' which might be themed as green in some setups
        return 'default'; // Changed to default, assuming it's themed positively
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'outline'; // Using outline for pending status
     }
  }


  return (
    <div className="space-y-4">
      <Textarea
        // Updated placeholder to emphasize double quotes requirement for JSON
        placeholder='Enter customer data as JSON (e.g., {"name": "J Doe", "email": "j.doe@mail.com", "signup_date": "2023-01-15"})'
        value={customerData}
        onChange={(e) => setCustomerData(e.target.value)}
        rows={6}
        disabled={isLoading}
        className="text-sm font-mono"
      />
      <Button onClick={handleDetectAnomaly} disabled={isLoading || !customerData.trim()}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          'Detect Anomalies'
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Input Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
             <p className="text-sm text-muted-foreground pt-1">{result.summary}</p>
          </CardHeader>
          <CardContent className="space-y-4">

            {anomaliesWithStatus.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">No anomalies detected.</p>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium">Detected Anomalies (Review Required):</h4>
                {anomaliesWithStatus.map((anomaly, index) => (
                  <Card key={index} className="bg-card border rounded-lg overflow-hidden">
                    <CardHeader className="p-4 bg-secondary/50 flex flex-row items-start sm:items-center justify-between gap-4">
                       <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">
                          Field: <code className="bg-muted px-1 rounded">{anomaly.field}</code>
                        </p>
                        <Badge variant={getStatusBadgeVariant(anomaly.status)} className="capitalize">
                            {anomaly.status}
                        </Badge>
                       </div>

                       {/* Show validation buttons only when pending */}
                       {anomaly.status === 'pending' && (
                         <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 mt-2 sm:mt-0">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                              onClick={() => handleValidation(index, 'approved')}
                              aria-label="Approve Anomaly"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                             <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleValidation(index, 'rejected')}
                                aria-label="Reject Anomaly"
                              >
                                <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-4 text-sm space-y-2">
                      <p>
                        <strong className="text-foreground">Description:</strong> {anomaly.description}
                      </p>
                      {anomaly.suggestedCorrection && (
                        <p>
                          <strong className="text-foreground">Suggestion:</strong>{' '}
                          {/* Using accent color for suggestions */}
                          <span className="text-accent font-medium">{anomaly.suggestedCorrection}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
