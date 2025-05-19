import { Input } from '@/components/ui/input'
interface AdditionalInformationProps {
  metaData?: string
  onMetadataChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const AdditionalInformation = ({
  metaData,
  onMetadataChange,
}: AdditionalInformationProps) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-md font-semibold text-indigo-400 mb-2">
          External Links
        </label>
        <Input
          placeholder="e.g., Project documentation, design files, etc."
          className="bg-slate-800/30 border-slate-700/50 text-white"
          value={metaData}
          onChange={onMetadataChange}
        />
      </div>
    </div>
  )
}

export default AdditionalInformation
