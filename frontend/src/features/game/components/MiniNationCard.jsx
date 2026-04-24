import { cn } from '../../../utils/styles';

const FLAG_MAP = {
  'USSR': '/flags/Russians_large.png',
  'Germany': '/flags/Germans_large.png',
  'UK': '/flags/British_large.png',
  'Japan': '/flags/Japanese_large.png',
  'USA': '/flags/Americans_large.png',
};

export default function MiniNationCard({ nation }) {
  const colorClasses = {
      'USSR': 'bg-faction-ussr text-white border-vintage-text',
      'Germany': 'bg-faction-germany text-white border-vintage-text',
      'UK': 'bg-faction-uk text-black border-vintage-text',
      'Japan': 'bg-faction-japan text-white border-vintage-text',
      'USA': 'bg-faction-usa text-white border-vintage-text',
  }[nation.name] || 'bg-vintage-paper';

  return (
    <div className={cn("p-2 border-2 shadow-[2px_2px_0_0_rgba(43,42,38,1)] flex justify-between items-center w-full", colorClasses)}>
        <div className="font-bold text-lg tracking-wider flex items-center gap-2">
            {FLAG_MAP[nation.name] && <img src={FLAG_MAP[nation.name]} alt={nation.name} className="w-6 h-6 rounded-full border border-black/30" />}
            {nation.name}
        </div>
        <div className="flex gap-6 text-sm uppercase opacity-90">
            <div className="text-right whitespace-nowrap"><span className="opacity-70 text-xs block -mb-1">Income</span><span className="font-bold">{nation.income}</span></div>
            <div className="text-right whitespace-nowrap"><span className="opacity-70 text-xs block -mb-1">Bank</span><span className="font-bold text-lg font-display">{nation.bank}</span></div>
        </div>
    </div>
  )
}
