
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { motion } from "framer-motion";

type Milestone = {
  id: string;
  title: string;
  description: string;
  value: string;
};

type MilestoneItemProps = {
  milestone: Milestone;
  onUpdate: (id: string, field: keyof Milestone, value: string) => void;
  onRemove: (id: string) => void;
};

const MilestoneItem = ({ milestone, onUpdate, onRemove }: MilestoneItemProps) => {
  return (
    <motion.div 
      className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/50 relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        boxShadow: "0 8px 20px -5px rgba(0,0,0,0.2)",
        borderColor: "rgba(139, 92, 246, 0.5)",
        transition: { duration: 0.2 }
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="text-xs text-slate-400 mb-1 block font-light">
            Milestone Title
          </label>
          <Input
            value={milestone.title}
            onChange={(e) => onUpdate(milestone.id, "title", e.target.value)}
            placeholder="e.g., Design Completion"
            className="bg-slate-800/50 border-slate-700/50 text-white"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs text-slate-400 mb-1 block font-light">
            Value (SUI)
          </label>
          <Input
            value={milestone.value}
            onChange={(e) => onUpdate(milestone.id, "value", e.target.value)}
            placeholder="e.g., 250"
            type="number"
            min="0"
            className="bg-slate-800/50 border-slate-700/50 text-white"
          />
        </div>
        <div className="md:col-span-1 flex items-end justify-end">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onRemove(milestone.id)}
              className="text-slate-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Remove milestone</span>
            </Button>
          </motion.div>
        </div>
      </div>
      <div className="mt-2">
        <label className="text-xs text-slate-400 mb-1 block font-light">
          Description
        </label>
        <Textarea
          value={milestone.description}
          onChange={(e) => onUpdate(milestone.id, "description", e.target.value)}
          placeholder="Describe what needs to be delivered for this milestone"
          className="bg-slate-800/50 border-slate-700/50 text-white min-h-[60px] resize-none"
        />
      </div>
    </motion.div>
  );
};

export default MilestoneItem;
