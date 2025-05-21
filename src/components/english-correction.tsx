import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { EnglishCorrectionInput, EnglishCorrectionOutput, correctEnglish } from '@/ai/flows/english-correction';
import { Loader2, AlertCircle, Twitter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const EnglishCorrection: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [preset, setPreset] = useState<string>('casual-message');
  const [tone, setTone] = useState<string>('casual');
  const [useCase, setUseCase] = useState<string>('message');
  const [grammarStrictness, setGrammarStrictness] = useState<string>('formal');
  const [enforceCharacterLimit, setEnforceCharacterLimit] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EnglishCorrectionOutput | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // Presets for quick selection
  const presets = [
    { id: 'casual-message', label: 'Casual Message', tone: 'casual', useCase: 'message', grammarStrictness: 'informal' },
    { id: 'professional-email', label: 'Professional Email', tone: 'professional', useCase: 'mail', grammarStrictness: 'formal' },
    { id: 'funny-tweet', label: 'Funny Tweet', tone: 'funny', useCase: 'funny_tweet', grammarStrictness: 'informal' },
    { id: 'professional-tweet', label: 'Professional Tweet', tone: 'professional', useCase: 'professional_tweet', grammarStrictness: 'formal' },
    { id: 'thread-tweet', label: 'Tweet Thread', tone: 'casual', useCase: 'thread_tweet', grammarStrictness: 'informal' },
    { id: 'genz-caption', label: 'Gen Z Caption', tone: 'casual', useCase: 'caption', grammarStrictness: 'genz_casual' },
    { id: 'academic', label: 'Academic Text', tone: 'formal', useCase: 'assignment', grammarStrictness: 'formal' },
  ];

  // Update individual settings when preset changes
  useEffect(() => {
    const selectedPreset = presets.find(p => p.id === preset);
    if (selectedPreset) {
      setTone(selectedPreset.tone);
      setUseCase(selectedPreset.useCase);
      setGrammarStrictness(selectedPreset.grammarStrictness);
      // Auto-enable character limit for tweet use cases
      setEnforceCharacterLimit(selectedPreset.useCase.includes('tweet'));
    }
  }, [preset]);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim()) {
      // Basic validation: do not submit if input is empty
      alert('Please enter some text to correct.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const input: EnglishCorrectionInput = {
        text: inputText,
        tone,
        useCase,
        grammarStrictness: grammarStrictness as EnglishCorrectionInput['grammarStrictness'],
        enforceCharacterLimit: useCase.includes('tweet') ? enforceCharacterLimit : undefined,
      };
      const correctionResult = await correctEnglish(input);
      setResult(correctionResult);
    } catch (error) {
      console.error('Error during English correction:', error);
      // Handle error appropriately in a real app (e.g., show a toast notification)
      alert('An error occurred while correcting the text.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, tone, useCase, grammarStrictness, enforceCharacterLimit]);

  return (
    <div className="space-y-4">
      {/* Input Text Area */}
      <div>
        <Label htmlFor="inputText" className="text-base font-medium">Enter Text:</Label>
        <Textarea
          id="inputText"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste your text here..."
          rows={5}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {inputText.length} characters
        </p>
      </div>

      {/* Quick Mode Selector */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-base font-medium">Quick Select:</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-xs"
          >
            {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <Badge 
              key={p.id}
              variant={preset === p.id ? "default" : "outline"} 
              className="cursor-pointer py-1 px-3 whitespace-nowrap"
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Advanced Options (Collapsible) */}
      {showAdvancedOptions && (
        <div className="pt-2 border-t">
          <h3 className="text-sm font-medium mb-2">Advanced Options:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tone" className="text-sm">Tone:</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone" className="mt-1">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="funny">Funny</SelectItem>
                  <SelectItem value="sarcastic">Sarcastic</SelectItem>
                  <SelectItem value="loving">Loving</SelectItem>
                  <SelectItem value="helpful">Helpful</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="useCase" className="text-sm">Use Case:</Label>
              <Select value={useCase} onValueChange={(value) => {
                setUseCase(value);
                // Auto-enable character limit for tweet use cases
                if (value.includes('tweet')) {
                  setEnforceCharacterLimit(true);
                }
              }}>
                <SelectTrigger id="useCase" className="mt-1">
                  <SelectValue placeholder="Select use case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mail">Email</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="professional_tweet">Professional Tweet</SelectItem>
                  <SelectItem value="funny_tweet">Funny Tweet</SelectItem>
                  <SelectItem value="thread_tweet">Tweet Thread</SelectItem>
                  <SelectItem value="caption">Caption</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grammarStrictness" className="text-sm">Grammar Style:</Label>
              <Select value={grammarStrictness} onValueChange={setGrammarStrictness}>
                <SelectTrigger id="grammarStrictness" className="mt-1">
                  <SelectValue placeholder="Select grammar style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="informal">Informal</SelectItem>
                  <SelectItem value="genz_casual">Gen Z Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Character limit toggle for tweets */}
          {useCase.includes('tweet') && (
            <div className="mt-3 flex items-center space-x-2">
              <Switch 
                id="character-limit" 
                checked={enforceCharacterLimit}
                onCheckedChange={setEnforceCharacterLimit}
              />
              <Label htmlFor="character-limit" className="text-sm">
                Enforce 280 character limit for tweets
              </Label>
            </div>
          )}
        </div>
      )}

      <Button 
        onClick={handleSubmit} 
        disabled={isLoading || !inputText.trim()} 
        className="w-full"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Correcting...</>
        ) : (
          'Correct & Format Text'
        )}
      </Button>

      {/* Results Section */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Display regular correction */}
          {!result.threadParts && (
            <div className="p-4 border rounded-md bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Correction Result:</h3>
                {result.characterCount && (
                  <Badge variant={result.characterCount > 280 && enforceCharacterLimit ? "destructive" : "secondary"}>
                    {result.characterCount} / 280
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Corrected Text:</p>
                <div className="whitespace-pre-wrap p-3 border rounded bg-background">{result.correctedText}</div>
              </div>
              
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Display thread parts if available */}
          {result.threadParts && result.threadParts.length > 0 && (
            <div className="p-4 border rounded-md bg-muted/50">
              <h3 className="text-lg font-semibold mb-3">Thread Result:</h3>
              <div className="space-y-3">
                {result.threadParts.map((part, index) => (
                  <Card key={index} className="p-3 border border-border">
                    <div className="flex items-start gap-2">
                      <Twitter className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">Tweet {index + 1}</Badge>
                          <Badge variant="secondary">{part.length} / 280</Badge>
                        </div>
                        <p className="whitespace-pre-wrap">{part}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnglishCorrection;
