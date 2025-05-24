import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import MilestoneItem from './MilestoneItem'
import { getMilestoneField } from '@/utils/milestone'

interface MilestoneListProps {
  milestones: any[]
  updateMilestone: (id: number, field: string, value: string) => void
  removeMilestone: (id: number) => void
  addMilestone: () => void
}

const MilestoneList = ({
  milestones,
  updateMilestone,
  removeMilestone,
  addMilestone,
}: MilestoneListProps) => {
  return (
    <div>
      {milestones.length > 0 ? (
        <div>
          {milestones.map((milestone) => {
            const isOnChain = !!milestone.fields
            return (
              <MilestoneItem
                key={getMilestoneField(milestone, 'id') || getMilestoneField(milestone, 'description_hash')}
                milestone={milestone}
                index={milestones.indexOf(milestone)}
                onUpdate={updateMilestone}
                onRemove={removeMilestone}
              />
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-indigo-300/70">
          No milestones added yet
        </div>
      )}
      <div className="flex justify-center mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={addMilestone}
          className="flex items-center gap-2 bg-[#0a0f1f]/60 border-indigo-900/30 hover:bg-[#0a0f1f]/80 text-indigo-300"
        >
          <PlusCircle size={16} />
          Add Milestone
        </Button>
      </div>
    </div>
  )
}

export default MilestoneList
