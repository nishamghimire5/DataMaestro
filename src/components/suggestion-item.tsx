'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { type SuggestionWithStatus } from './csv-processing';
import { AccordionItem, AccordionContent } from '@/components/ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, Pencil } from "lucide-react";

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";

// Removed Helper function here

interface SuggestionItemProps {
  suggestion: SuggestionWithStatus;
  category: 'user' | 'general';
  // Removed numericStats prop as it's calculated internally now
  currentCsvData: string | null; // Pass the current CSV data
  onToggleStatus: (id: string, category: 'user' | 'general', userReplacement?: string) => void;
  onImputationChange: (id: string, category: 'user' | 'general', method: 'mean' | 'median' | 'mode') => void;
  
}

// Custom Accordion Trigger remains the same
const CustomAccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex flex-1 items-center justify-between text-left font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 ml-2",
      "focus-visible:outline-none focus-visible:ring-0", // Remove focus ring from trigger itself if parent handles focus-within
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ml-2" />
  </AccordionPrimitive.Trigger>
));
CustomAccordionTrigger.displayName = 'CustomAccordionTrigger';


const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  category,
  currentCsvData, // Receive current data
  onToggleStatus,
  onImputationChange,
}) => {

  const [userReplacement, setUserReplacement] = useState(suggestion.userProvidedReplacement || '');

  const handleStatusToggle = useCallback(() => {
    // Pass the current userReplacement value ONLY if the action is REVIEW_CONSISTENCY and status becomes 'approved'
    const replacementToSend = (suggestion.actionType === 'REVIEW_CONSISTENCY' && suggestion.status === 'pending') ? userReplacement : undefined;
    onToggleStatus(suggestion.id, category, replacementToSend);
  }, [suggestion.id, category, onToggleStatus, userReplacement, suggestion.actionType, suggestion.status]);

   const handleReplacementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserReplacement(e.target.value);
  };

  // Use the user replacement value when approving REVIEW_CONSISTENCY
  const handleAcceptWithReplacement = useCallback(() => {
     // Mark as approved and pass the user replacement value
     onToggleStatus(suggestion.id, category, userReplacement || suggestion.suggestedFragment); // Fallback to suggested if empty
  }, [suggestion.id, category, onToggleStatus, userReplacement, suggestion.suggestedFragment]);

  const checkboxId = `suggestion-checkbox-${suggestion.id}`;

  // Calculate numeric stats here using useMemo, only when needed
  const numericStats = useMemo(() => {
    if (suggestion.actionType === 'FILL_MISSING_NUMERIC' && suggestion.columnName && currentCsvData) {
      try {
        // Calculate stats from CSV data for this column
        const parseResult = Papa.parse(currentCsvData, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false
        });

        if (parseResult.errors.length > 0) {
          console.warn("CSV parsing issues in SuggestionItem:", parseResult.errors);
        }

        const data = parseResult.data || [];
        if (!data || data.length === 0) return null;

        const headerRow = parseResult.meta.fields || [];
        // Check if column name exists before processing
        if (!suggestion.columnName) {
          console.warn('No column name provided in suggestion');
          return null;
        }
        
        let actualColumnName = suggestion.columnName;
        if (!headerRow.includes(actualColumnName)) {
          const matchingHeader = headerRow.find(h => h.toLowerCase() === actualColumnName.toLowerCase());
          if (matchingHeader) {
            actualColumnName = matchingHeader;
          } else {
            console.warn(`Column '${actualColumnName}' not found in SuggestionItem.`);
            return null;
          }
        }
        
        const values = data
          .map((row: any) => row[actualColumnName])
          .filter((val: any) => val !== null && val !== undefined && String(val).trim() !== '')
          .map((val: any) => parseFloat(String(val)))
          .filter((num: number) => !isNaN(num));

        if (values.length === 0) return null;

        const sum = values.reduce((acc: number, val: number) => acc + val, 0);
        const mean = sum / values.length;

        values.sort((a: number, b: number) => a - b);
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

        const frequency: { [key: number]: number } = {};
        let maxFreq = 0;
        let modes: number[] = [];
        values.forEach((val: number) => {
          frequency[val] = (frequency[val] || 0) + 1;
          if (frequency[val] > maxFreq) {
            maxFreq = frequency[val];
          }
        });
        
        for (const valKey in frequency) {
          if (frequency[Number(valKey)] === maxFreq) {
            modes.push(parseFloat(valKey));
          }
        }
        
        const mode = modes.length > 0 && maxFreq > 1 ? modes[0] : mean;
        return { mean, median, mode };
      } catch (e) {
        console.error(`Error calculating stats for column '${suggestion.columnName}':`, e);
        return null;
      }
    }
    return null;
  }, [suggestion.actionType, suggestion.columnName, currentCsvData]);

  return (
    <AccordionItem value={suggestion.id} className="border rounded-md shadow-sm bg-card">
       <AccordionPrimitive.Header className="flex items-center p-3 hover:bg-muted/50 rounded-t-md text-left text-sm w-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {/* Interactive area for status toggling - DIV */}
        <div
          className="flex items-center gap-2 cursor-pointer rounded p-1 flex-shrink-0 focus:outline-none"
          onClick={handleStatusToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleStatusToggle();
            }
          }}
          role="checkbox"
          aria-checked={suggestion.status === 'approved'}
          tabIndex={0}
          aria-labelledby={`${checkboxId}-label`}
        >
          <Checkbox
            id={checkboxId}
            checked={suggestion.status === 'approved'}
            onCheckedChange={() => {}} /* Use empty function instead of readOnly */
            aria-hidden="true"
            className="mr-1 flex-shrink-0 pointer-events-none"
          />
          <Badge
            id={`${checkboxId}-label`}
            variant={suggestion.status === 'approved' ? 'default' : suggestion.status === 'rejected' ? 'destructive' : 'secondary'}
            className="capitalize text-xs"
          >
            {suggestion.status}
          </Badge>
        </div>

         {/* Use CustomAccordionTrigger */}
         <CustomAccordionTrigger aria-label={`Details for suggestion: ${suggestion.description}`}>
           <div className="flex-1 min-w-0">
             <p className="font-medium truncate" title={suggestion.description}>{suggestion.description}</p>
             <div className="flex flex-wrap gap-1 mt-1">
               <Badge variant={suggestion.actionType === 'REMOVE_ROW' ? 'destructive' : 'outline'} className="text-xs">{suggestion.actionType}</Badge>
               {suggestion.columnName && <Badge variant="outline" className="text-xs">Col: {suggestion.columnName}</Badge>}
               {suggestion.rowNumber && <Badge variant="outline" className="text-xs">Row: {suggestion.rowNumber}</Badge>}
                {suggestion.affectedRows && !suggestion.rowNumber && <Badge variant="outline" className="text-xs">~{suggestion.affectedRows} rows</Badge>}
               {suggestion.priority && <Badge variant="outline" className="text-xs capitalize">Priority: {suggestion.priority}</Badge>}
               {suggestion.confidence !== undefined && <Badge variant="outline" className="text-xs">Conf: {(suggestion.confidence * 100).toFixed(0)}%</Badge>}
             </div>
           </div>
         </CustomAccordionTrigger>
       </AccordionPrimitive.Header>

      <AccordionContent className="p-3 pt-0 text-sm space-y-2 bg-muted/20 rounded-b-md">
        <p><strong>Original:</strong> <code className="bg-background px-1 rounded text-muted-foreground max-w-md truncate inline-block" title={suggestion.originalFragment}>{suggestion.originalFragment}</code></p>

        {/* Specific handling for REVIEW_CONSISTENCY */}
        {suggestion.actionType === 'REVIEW_CONSISTENCY' && (
            <div className="mt-2 space-y-2 p-2 border border-dashed rounded bg-background">
                 <p><strong>AI Suggestion:</strong> <code className="bg-primary/10 text-primary px-1 rounded font-semibold max-w-md truncate inline-block" title={suggestion.suggestedFragment}>{suggestion.suggestedFragment}</code></p>
                 <Label htmlFor={`replace-${suggestion.id}`} className="font-semibold block">Your Replacement (Optional):</Label>
                 <div className="flex items-center gap-2">
                    <Input
                        id={`replace-${suggestion.id}`}
                        value={userReplacement}
                        onChange={handleReplacementChange}
                        placeholder="Enter custom value or leave blank to use AI suggestion"
                        className="flex-grow text-sm h-8"
                        // Disable if not pending
                        disabled={suggestion.status !== 'pending'}
                    />
                     <Button
                         size="sm"
                         variant="outline"
                         onClick={handleAcceptWithReplacement}
                         // Enable only if pending and user has entered text OR if approving the AI suggestion without text
                         disabled={suggestion.status !== 'pending' || (!userReplacement.trim() && suggestion.suggestedFragment?.toUpperCase().includes('MANUAL REVIEW'))}
                         className="h-8 text-xs"
                         aria-label="Accept with replacement value"
                     >
                         Accept w/ Input
                     </Button>
                 </div>
                 <p className="text-xs text-muted-foreground">Toggle status checkmark to approve AI suggestion (if reasonable), or enter a value and click 'Accept w/ Input'.</p>
             </div>
        )}

        {/* Handling for other action types (excluding REVIEW_CONSISTENCY) */}
        {suggestion.actionType !== 'FILL_MISSING_NUMERIC' && suggestion.actionType !== 'REVIEW_CONSISTENCY' && (
          <p><strong>Suggested:</strong> <code className="bg-primary/10 text-primary px-1 rounded font-semibold max-w-md truncate inline-block" title={suggestion.suggestedFragment}>{suggestion.suggestedFragment}</code></p>
        )}

        {/* Display imputation options only if stats are available */}
       

        {suggestion.rationale && <p className="text-xs italic text-muted-foreground pt-1"><strong>Rationale:</strong> {suggestion.rationale}</p>}
      </AccordionContent>
    </AccordionItem>
  );
};

export default SuggestionItem;
