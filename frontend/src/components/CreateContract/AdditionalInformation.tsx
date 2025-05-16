import { Input } from "@/components/ui/input";

const AdditionalInformation = () => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          External Links
        </label>
        <Input 
          placeholder="e.g., Project documentation, design files, etc." 
          className="bg-slate-800/30 border-slate-700/50 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Additional Notes
        </label>
        <textarea
          placeholder="Any other relevant information about this agreement..."
          rows={4}
          className="w-full rounded-md bg-slate-800/30 border-slate-700/50 text-white p-2"
        />
      </div>
    </div>
  );
};

export default AdditionalInformation;
