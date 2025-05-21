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

const EnglishCorrection: React.FC = () => {  const [inputText, setInputText] = useState<string>('');
  const [preset, setPreset] = useState<string>('casual-message');
  const [customTone, setCustomTone] = useState<string>('casual'); 
  const [customGrammarStyle, setCustomGrammarStyle] = useState<string>('informal');
  const [enforceCharacterLimit, setEnforceCharacterLimit] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EnglishCorrectionOutput | null>(null);
  const [showCustomOptions, setShowCustomOptions] = useState<boolean>(false);
  const [mode, setMode] = useState<'correct' | 'generate'>('correct');// Combined format presets (merging previous use case and tone concepts)
  const presets = [
    // Messages and Emails
    { id: 'casual-message', label: 'Casual Message', tone: 'casual', useCase: 'message', grammarStrictness: 'informal' },
    { id: 'professional-email', label: 'Professional Email', tone: 'professional', useCase: 'mail', grammarStrictness: 'formal' },
    
    // Social Media
    { id: 'casual-tweet', label: 'Casual Tweet', tone: 'casual', useCase: 'tweet', grammarStrictness: 'informal' },
    { id: 'professional-tweet', label: 'Professional Tweet', tone: 'professional', useCase: 'professional_tweet', grammarStrictness: 'formal' },
    { id: 'funny-tweet', label: 'Funny Tweet', tone: 'funny', useCase: 'funny_tweet', grammarStrictness: 'informal' },
    { id: 'thread-tweet', label: 'Tweet Thread', tone: 'casual', useCase: 'thread_tweet', grammarStrictness: 'informal' },
    { id: 'genz-caption', label: 'Gen Z Caption', tone: 'casual', useCase: 'caption', grammarStrictness: 'genz_casual' },
    
    // Formal Writing
    { id: 'academic', label: 'Academic Text', tone: 'formal', useCase: 'assignment', grammarStrictness: 'formal' },
    
    // Additional professional formats  
    { id: 'polite-request', label: 'Polite Request', tone: 'helpful', useCase: 'mail', grammarStrictness: 'formal' },
    { id: 'leave-notice', label: 'Leave Notice', tone: 'professional', useCase: 'mail', grammarStrictness: 'formal' },
  ];
  
  // Get the currently selected preset
  const getSelectedPreset = () => presets.find(p => p.id === preset) || presets[0];
  // Update character limit based on preset changes
  useEffect(() => {
    const selectedPreset = getSelectedPreset();
    // Auto-enable character limit for tweet use cases
    setEnforceCharacterLimit(selectedPreset.useCase.includes('tweet'));
  }, [preset]);
    
  const handleSubmit = useCallback(async () => {
    if (!inputText.trim()) {
      // Basic validation: do not submit if input is empty
      alert('Please enter ' + (mode === 'correct' ? 'text to correct' : 'instructions for generating text'));
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const selectedPreset = getSelectedPreset();
      
      // Use either the preset values or custom values if in custom mode
      const tone = showCustomOptions ? customTone : selectedPreset.tone;
      const useCase = selectedPreset.useCase;
      const grammarStrictness = showCustomOptions ? customGrammarStyle : selectedPreset.grammarStrictness;
      
      // Enforce formal tone for emails regardless of other settings
      const effectiveTone = useCase === 'mail' ? 'professional' : tone;
      const effectiveGrammarStrictness = useCase === 'mail' ? 'formal' : grammarStrictness;
      
      // The input text is used directly - any translation instructions should be included by the user
      // within their text prompt
      const finalText = inputText;
      
      // Set up input for the AI flow
      const input: EnglishCorrectionInput = {
        text: finalText,
        tone: effectiveTone,
        useCase,
        grammarStrictness: effectiveGrammarStrictness as EnglishCorrectionInput['grammarStrictness'],
        enforceCharacterLimit: useCase.includes('tweet') ? enforceCharacterLimit : undefined,
        isGenerationMode: mode === 'generate',
        // These will be parsed from the text if needed by the AI model
        targetLanguage: undefined,
        includeRomanization: undefined
      };
      
      const correctionResult = await correctEnglish(input);
      setResult(correctionResult);
    } catch (error) {
      console.error('Error during English ' + (mode === 'correct' ? 'correction' : 'generation') + ':', error);
      // Handle error appropriately in a real app (e.g., show a toast notification)
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, customTone, customGrammarStyle, enforceCharacterLimit, preset, showCustomOptions, mode]);
  return (
    <div className="space-y-4">
      {/* Mode selector tabs */}
      <Tabs 
        value={mode} 
        onValueChange={(value) => setMode(value as 'correct' | 'generate')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="correct">Correct Text</TabsTrigger>
          <TabsTrigger value="generate">Generate Text</TabsTrigger>
        </TabsList>
        
        <TabsContent value="correct" className="mt-2">
          <Label htmlFor="correctText" className="text-base font-medium">Enter Text to Correct:</Label>          <Textarea
            id="correctText"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste the text you want to improve here..."
            rows={5}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {inputText.length} characters
          </p>
        </TabsContent>
        
        <TabsContent value="generate" className="mt-2">
          <Label htmlFor="generateText" className="text-base font-medium">Enter Instructions:</Label>
          <Textarea
            id="generateText"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe what you want to create. For example: 'Write an email to my supervisor explaining I need to take tomorrow off due to a doctor's appointment.'"
            rows={5}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1 italic">
            Be specific about your requirements and include any details you want to appear in the text.
          </p>
        </TabsContent>
      </Tabs>{/* Format Selector */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-base font-medium">Format:</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowCustomOptions(!showCustomOptions)}
            className="text-xs"
          >
            {showCustomOptions ? 'Use Presets Only' : 'Customize Tone & Style'}
          </Button>
        </div>
        
        {/* Group presets by category */}
        <div className="space-y-3">
          {/* Messages and Emails */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Communication:</p>
            <div className="flex flex-wrap gap-2">
              {presets.filter(p => ['message', 'mail'].includes(p.useCase)).map(p => (
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
          
          {/* Social Media */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Social Media:</p>
            <div className="flex flex-wrap gap-2">
              {presets.filter(p => p.useCase.includes('tweet') || p.useCase === 'caption').map(p => (
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
          
          {/* Formal Writing */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Formal Writing:</p>
            <div className="flex flex-wrap gap-2">
              {presets.filter(p => p.useCase === 'assignment').map(p => (
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
        </div>
      </div>

      {/* Custom Options (Collapsible) */}
      {showCustomOptions && (
        <div className="pt-2 border-t">
          <h3 className="text-sm font-medium mb-2">Custom Tone & Style:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone" className="text-sm">Tone:</Label>
              <Select value={customTone} onValueChange={setCustomTone}>
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
              <Label htmlFor="grammarStyle" className="text-sm">Grammar Style:</Label>
              <Select value={customGrammarStyle} onValueChange={setCustomGrammarStyle}>
                <SelectTrigger id="grammarStyle" className="mt-1">
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
        </div>
      )}

      {/* Character limit toggle for tweets */}
      {getSelectedPreset().useCase.includes('tweet') && (
        <div className="mt-2 flex items-center space-x-2 pt-2 border-t">
          <Switch 
            id="character-limit" 
            checked={enforceCharacterLimit}
            onCheckedChange={setEnforceCharacterLimit}
          />
          <Label htmlFor="character-limit" className="text-sm">
            Enforce 280 character limit for tweets
          </Label>
        </div>
      )}      {/* Translation section - Simplified to instructions */}
      <div className="mt-2 pt-2 border-t">
        <div className="p-3 border rounded bg-muted/30">
          <p className="text-sm font-medium mb-1">Need a translation?</p>
          <p className="text-xs text-muted-foreground">
            Simply include translation instructions in your text input above.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Examples:
            <br/>• "Translate this to Spanish"
            <br/>• "Please correct and translate to Japanese"
            <br/>• "Make this more formal and convert it to French"
          </p>
          <p className="text-xs text-amber-600 font-medium mt-2">
            Tip: For romanized versions of non-Latin scripts, just ask for it in your prompt
            (e.g., "translate to Chinese and include romanization").
          </p>
        </div>
      </div>
      
      <Button 
        onClick={handleSubmit} 
        disabled={isLoading || !inputText.trim()} 
        className="w-full mt-4"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {mode === 'correct' ? 'Correcting...' : 'Generating...'}</>
        ) : (
          mode === 'correct' ? 'Correct & Format Text' : 'Generate Text'
        )}
      </Button>      {/* Results Section */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Display regular correction - show for all formats except when we have thread_tweet with threadParts */}
          {(!result.threadParts || getSelectedPreset().useCase !== 'thread_tweet') && (
            <div className="p-4 border rounded-md bg-muted/50">              <div className="flex justify-between items-center mb-2">                <div>
                  <h3 className="text-lg font-semibold">{mode === 'correct' ? 'Correction Result:' : 'Generated Text:'}</h3>
                </div>
                {result.characterCount && (
                  <Badge variant={result.characterCount > 280 && enforceCharacterLimit ? "destructive" : "secondary"}>
                    {result.characterCount} / 280
                  </Badge>
                )}
              </div><div className="space-y-2">
                <p className="text-sm text-muted-foreground">{mode === 'correct' ? 'Corrected Text:' : 'Generated Text:'}</p>                <div className="whitespace-pre-wrap p-3 border rounded bg-background">
                  {result.correctedText}
                </div>
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
          )}          {/* Display thread parts only for thread_tweet format */}
          {result.threadParts && result.threadParts.length > 0 && getSelectedPreset().useCase === 'thread_tweet' && (<div className="p-4 border rounded-md bg-muted/50">              <div className="mb-3">
                <h3 className="text-lg font-semibold">Thread Result:</h3>
              </div>
              <div className="space-y-3">
                {result.threadParts.map((part, index) => (
                  <Card key={index} className="p-3 border border-border">
                    <div className="flex items-start gap-2">
                      <Twitter className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">Tweet {index + 1}</Badge>
                          <Badge variant="secondary">{part.length} / 280</Badge>
                        </div>                        <div className="whitespace-pre-wrap">
                          {part}
                        </div>
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
