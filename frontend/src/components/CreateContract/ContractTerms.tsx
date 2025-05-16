import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ContractTermsProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  setEndDate: (date: Date | undefined) => void;
}

const ContractTerms = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate 
}: ContractTermsProps) => {
  // Simple date input handlers
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    setStartDate(date);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    setEndDate(date);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Start Date
          </label>
          <Input 
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={handleStartDateChange}
            className="bg-slate-800/30 border-slate-700/50 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            End Date
          </label>
          <Input 
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={handleEndDateChange}
            className="bg-slate-800/30 border-slate-700/50 text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Contract Summary
        </label>
        <textarea
          placeholder="Brief description of the agreement terms..."
          rows={4}
          className="w-full rounded-md bg-slate-800/30 border-slate-700/50 text-white p-2"
        />
      </div>
    </div>
  );
};

export default ContractTerms;
