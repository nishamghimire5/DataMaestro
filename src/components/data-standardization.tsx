'use client';

import { useState } from 'react';
import { standardizeData, type StandardizeDataOutput } from '@/ai/flows/data-standardization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast'; // Import useToast

type FieldType = 'date' | 'address' | 'text';

export interface StandardizationResult extends StandardizeDataOutput {
  originalValue: string;
  fieldName: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Define props for the component, including the callback
interface DataStandardizationProps {
    onValidation?: (result: StandardizationResult, processingTime: number) => void;
}


export default function DataStandardization({ onValidation }: DataStandardizationProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [fieldType, setFieldType] = useState<FieldType | ''>('');
  const [formatHint, setFormatHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StandardizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast(); // Initialize toast
  const [startTime, setStartTime] = useState<number | null>(null); // State to track start time


  const handleStandardize = async () => {
    if (!fieldName.trim() || !fieldValue.trim() || !fieldType) {
      const missingFields = [
          !fieldName.trim() && "Field Name",
          !fieldValue.trim() && "Field Value",
          !fieldType && "Field Type"
      ].filter(Boolean).join(', ');
      const errorMsg = `Please fill in required fields: ${missingFields}.`;
      setError(errorMsg);
       toast({ // Add toast for user feedback
           title: "Input Required",
           description: errorMsg,
           variant: "destructive",
       });
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStartTime(Date.now()); // Record start time

    try {
      const output = await standardizeData({
        fieldName,
        fieldValue,
        fieldType,
        formatHint: formatHint.trim() || undefined,
      });
      const newResult = {
         ...output,
         originalValue: fieldValue,
         fieldName: fieldName,
         status: 'pending' as const, // Ensure status is 'pending' initially
       };
      setResult(newResult);
      toast({ // Success toast
        title: "Standardization Suggested",
        description: `Proposed change for field '${fieldName}'. Please review.`,
        variant: "default",
      });
    } catch (e) {
      console.error('Error standardizing data:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during standardization.';
      setError(errorMessage);
      toast({ // Error toast
         title: "Standardization Error",
         description: errorMessage,
         variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Keep startTime until validation happens
    }
  };

  const handleValidation = (status: 'approved' | 'rejected') => {
     if (result) {
         const endTime = Date.now(); // Record end time for validation
         const processingTime = startTime ? endTime - startTime : 0; // Calculate duration

         const updatedResult = { ...result, status };
         setResult(updatedResult);

         // Call the callback function if provided
         if (onValidation) {
             onValidation(updatedResult, processingTime);
         }

         toast({ // Toast for validation action
             title: `Standardization ${status}`,
             description: `Field: ${updatedResult.fieldName}, New Value: ${updatedResult.standardizedValue}`,
             variant: status === 'approved' ? 'default' : 'destructive',
         });

         // Reset start time after validation
         // setStartTime(null); // Or keep it until next 'Standardize' click
     }
  };

   const getStatusBadgeVariant = (status: 'pending' | 'approved' | 'rejected'): "default" | "secondary" | "destructive" | "outline" => {
     switch (status) {
      case 'approved':
        return 'default'; // Changed to default, assuming it's themed positively
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'outline';
     }
  }

  return (
    <div className="space-y-6">      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 items-end">
        <div>
          <Label htmlFor="fieldName" className="block mb-1">Field Name *</Label>
          <Input
            id="fieldName"
            placeholder="e.g., signup_date"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            disabled={isLoading}
            required
            aria-required="true"
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="fieldValue" className="block mb-1">Field Value *</Label>
          <Input
            id="fieldValue"
            placeholder="e.g., Jan 15, 2023"
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            disabled={isLoading}
            required
            aria-required="true"
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="fieldType" className="block mb-1">Field Type *</Label>
          <Select
            value={fieldType}
            onValueChange={(value: FieldType | '') => setFieldType(value)}
            disabled={isLoading}
            required
            aria-required="true"
          >
            <SelectTrigger id="fieldType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="address">Address</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="formatHint">Format Hint (Optional)</Label>
          <Input
            id="formatHint"
            placeholder="e.g., YYYY-MM-DD"
            value={formatHint}
            onChange={(e) => setFormatHint(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <Button
        onClick={handleStandardize}
        disabled={isLoading || !fieldName.trim() || !fieldValue.trim() || !fieldType}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Standardizing...
          </>
        ) : (
          'Standardize Data'
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
            <CardHeader className="flex flex-row items-center justify-between pb-2"> {/* Reduced padding */}
                 <CardTitle className="text-lg">Standardization Result</CardTitle> {/* Adjusted size */}
                 <div className="flex items-center gap-2">
                     {result.status === 'pending' && (
                        <div className="flex gap-2">
                            <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                            onClick={() => handleValidation('approved')}
                            aria-label="Approve Standardization"
                            >
                            <Check className="h-4 w-4" />
                            </Button>
                            <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleValidation('rejected')}
                            aria-label="Reject Standardization"
                            >
                            <X className="h-4 w-4" />
                            </Button>
                        </div>
                     )}
                     <Badge variant={getStatusBadgeVariant(result.status)} className="capitalize">
                        {result.status}
                     </Badge>
                 </div>
             </CardHeader>
           <CardContent className="space-y-4 pt-4">             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="space-y-1">
                    <p className="text-muted-foreground">Field Name</p>
                    <p className="font-medium break-words">{result.fieldName}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Original Value</p>
                    <p className="font-mono bg-muted px-1 py-0.5 rounded break-all">{result.originalValue}</p>
                 </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground">Standardized Value</p>
                    <p className="font-mono bg-primary/10 text-green-700 px-1 py-0.5 rounded break-all font-semibold">{result.standardizedValue}</p>
                </div>
                {result.explanation && (
                    <div className="space-y-1 sm:col-span-2">
                        <p className="text-muted-foreground">Explanation</p>
                        <p className="italic text-xs">{result.explanation}</p>
                    </div>
                )}
             </div>
           </CardContent>

         </Card>
       )}
    </div>
  );
}
