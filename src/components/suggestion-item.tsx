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
  currentCsvData: string | null; // Pass the current CSV data
  onToggleStatus: (id: string, category: 'user' | 'general', userReplacement?: string) => void;
  onImputationChange: (id: string, category: 'user' | 'general', method: 'mean' | 'median' | 'mode') => void;
}

const CustomAccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex flex-1 items-center justify-between text-left font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 ml-2",
      "focus-visible:outline-none focus-visible:ring-0",
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
  currentCsvData,
  onToggleStatus,
  onImputationChange,
}) => {

  const [userReplacement, setUserReplacement] = useState(suggestion.userProvidedReplacement || '');
  const [selectedLocalImputation, setSelectedLocalImputation] = useState<string | undefined>(suggestion.selectedImputationMethod);

  const handleStatusToggle = useCallback(() => {
    let replacementToSend = undefined;
    if (suggestion.actionType === 'FILL_MISSING_NUMERIC' && !selectedLocalImputation && userReplacement.trim()) {
      replacementToSend = userReplacement;
    } else if (suggestion.actionType !== 'FILL_MISSING_NUMERIC' && suggestion.actionType !== 'REVIEW_CONSISTENCY' && userReplacement.trim()) {
      replacementToSend = userReplacement;
    } else if (suggestion.actionType === 'REVIEW_CONSISTENCY' && suggestion.status === 'pending') {
    }
    onToggleStatus(suggestion.id, category, replacementToSend);
  }, [suggestion.id, category, onToggleStatus, userReplacement, suggestion.actionType, suggestion.status, selectedLocalImputation]);

  const handleReplacementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserReplacement(e.target.value);
    if (suggestion.actionType === 'FILL_MISSING_NUMERIC') {
      setSelectedLocalImputation(undefined);
    }
  };

  const handleAcceptWithReplacement = useCallback(() => {
    onToggleStatus(suggestion.id, category, userReplacement || suggestion.suggestedFragment);
  }, [suggestion.id, category, onToggleStatus, userReplacement, suggestion.suggestedFragment]);

  const handleImputationRadioChange = (method: 'mean' | 'median' | 'mode') => {
    setSelectedLocalImputation(method);
    onImputationChange(suggestion.id, category, method);
    setUserReplacement('');
  };

  const checkboxId = `suggestion-checkbox-${suggestion.id}`;

  const numericStats = useMemo(() => {
    if (suggestion.actionType === 'FILL_MISSING_NUMERIC' && suggestion.columnName && currentCsvData) {
      try {
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
            onCheckedChange={() => {}}
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
                        disabled={suggestion.status !== 'pending'}
                    />
                     <Button
                         size="sm"
                         variant="outline"
                         onClick={handleAcceptWithReplacement}
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

        {suggestion.actionType === 'FILL_MISSING_NUMERIC' && (
          <div className="mt-2 space-y-3 p-2 border border-dashed rounded bg-background">
            <p className="font-semibold">Fill missing value in <code className="text-primary">{suggestion.columnName}</code> with:</p>
            <RadioGroup
              value={selectedLocalImputation}
              onValueChange={(value) => handleImputationRadioChange(value as 'mean' | 'median' | 'mode')}
              disabled={suggestion.status !== 'pending'}
            >
              {suggestion.imputationOptions?.mean !== undefined && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mean" id={`${suggestion.id}-mean`} />
                  <Label htmlFor={`${suggestion.id}-mean`}>Mean ({suggestion.imputationOptions.mean.toFixed(2)})</Label>
                </div>
              )}
              {suggestion.imputationOptions?.median !== undefined && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="median" id={`${suggestion.id}-median`} />
                  <Label htmlFor={`${suggestion.id}-median`}>Median ({suggestion.imputationOptions.median})</Label>
                </div>
              )}
              {suggestion.imputationOptions?.mode !== undefined && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mode" id={`${suggestion.id}-mode`} />
                  <Label htmlFor={`${suggestion.id}-mode`}>Mode ({suggestion.imputationOptions.mode})</Label>
                </div>
              )}
            </RadioGroup>
            <div className="flex items-center gap-2 pt-2">
              <Label htmlFor={`manual-fill-${suggestion.id}`} className="font-semibold whitespace-nowrap">Or Manual Value:</Label>
              <Input
                id={`manual-fill-${suggestion.id}`}
                value={userReplacement}
                onChange={handleReplacementChange}
                placeholder="Enter custom value"
                className="flex-grow text-sm h-8"
                disabled={suggestion.status !== 'pending'}
              />
            </div>
            <p className="text-xs text-muted-foreground">Select a method or enter a manual value. Approving the suggestion will use the selected/entered value.</p>
          </div>
        )}

        {suggestion.actionType !== 'FILL_MISSING_NUMERIC' && 
         suggestion.actionType !== 'REVIEW_CONSISTENCY' && 
         suggestion.suggestedFragment && (
          <div className="mt-2 space-y-2 p-2 border border-dashed rounded bg-background">
            <p><strong>AI Suggestion:</strong> <code className="bg-primary/10 text-primary px-1 rounded font-semibold max-w-md truncate inline-block" title={suggestion.suggestedFragment}>{suggestion.suggestedFragment}</code></p>
            <Label htmlFor={`override-${suggestion.id}`} className="font-semibold block">Your Value (Optional Override):</Label>
            <Input
                id={`override-${suggestion.id}`}
                value={userReplacement}
                onChange={handleReplacementChange}
                placeholder="Enter your value to override AI suggestion"
                className="flex-grow text-sm h-8"
                disabled={suggestion.status !== 'pending'}
            />
            <p className="text-xs text-muted-foreground">Enter a value to use your own. If blank, approving accepts the AI's suggestion. Toggle status checkmark to approve.</p>
          </div>
        )}

        {suggestion.actionType !== 'FILL_MISSING_NUMERIC' && 
         suggestion.actionType !== 'REVIEW_CONSISTENCY' && 
         !suggestion.suggestedFragment && 
         suggestion.actionType !== 'REMOVE_ROW' && (
          <p className="mt-1"><strong>Suggested:</strong> <code className="bg-primary/10 text-primary px-1 rounded font-semibold max-w-md truncate inline-block" title={suggestion.suggestedFragment}>{suggestion.suggestedFragment || 'No specific change suggested, review description.'}</code></p>
        )}

        {suggestion.rationale && <p className="text-xs italic text-muted-foreground pt-1"><strong>Rationale:</strong> {suggestion.rationale}</p>}
      </AccordionContent>
    </AccordionItem>
  );
};

export default SuggestionItem;
