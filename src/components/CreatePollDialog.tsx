import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, BarChart2, MessageSquare } from "lucide-react";
import { generateUUID } from '@/utils/uuid';
import { cn } from '@/lib/utils';

interface CreatePollDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pollData: {
    question: string;
    options: { id: string; text: string; userIds: string[] }[];
    allowMultipleAnswers: boolean;
  }) => void;
}

export const CreatePollDialog: React.FC<CreatePollDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([
    { id: generateUUID(), text: '' },
    { id: generateUUID(), text: '' }
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const addOption = () => {
    setOptions([...options, { id: generateUUID(), text: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = options
      .filter(opt => opt.text.trim() !== '')
      .map(opt => ({
        id: opt.id,
        text: opt.text.trim(),
        userIds: []
      }));

    if (question.trim() === '' || validOptions.length < 2) {
      return;
    }

    onSubmit({
      question: question.trim(),
      options: validOptions,
      allowMultipleAnswers: allowMultiple
    });

    // Reset and close
    setQuestion('');
    setOptions([
      { id: generateUUID(), text: '' },
      { id: generateUUID(), text: '' }
    ]);
    setAllowMultiple(false);
    onClose();
  };

  const isValid = question.trim() !== '' && options.filter(o => o.text.trim() !== '').length >= 2;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
              <div className="p-2 bg-primary rounded-lg text-white shadow-lg shadow-primary/30">
                <BarChart2 className="w-6 h-6" />
              </div>
              Create a Poll
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
              Engage your team by asking a question and gathering feedback.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white dark:bg-slate-900">
          <div className="space-y-3">
            <Label htmlFor="question" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Question
            </Label>
            <Input
              id="question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoComplete="off"
              className="h-12 text-base focus-visible:ring-primary border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Options
            </Label>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2 group">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      autoComplete="off"
                      className="h-11 pl-4 focus-visible:ring-primary border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-2 border-dashed border-2 py-6 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all font-semibold"
              onClick={addOption}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another option
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <Label htmlFor="multiple-answers" className="text-sm font-bold">Allow multiple answers</Label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Voters can select more than one choice.
              </p>
            </div>
            <Switch
              id="multiple-answers"
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <DialogFooter className="pt-2 gap-3 sm:gap-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid}
              className={cn(
                "px-8 font-bold shadow-lg shadow-primary/20 h-11",
                isValid ? "bg-primary hover:bg-primary-hover text-white" : "opacity-50"
              )}
            >
              Create Poll
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
