import { useState } from "react";

const agreementTypes = [
  "Service Agreement",
  "Employment Contract",
  "Consulting Agreement",
  "Partnership Agreement",
  "Licensing Agreement",
  "Custom Agreement"
];

const AgreementType = () => {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
  };

  return (
    <div className="space-y-4">
      <div className="w-full">
        <select
          className="w-full px-4 py-2 rounded-md bg-slate-800/30 border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={selectedType || ""}
          onChange={handleChange}
        >
          <option value="" disabled>
            Select agreement type
          </option>
          {agreementTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AgreementType;
