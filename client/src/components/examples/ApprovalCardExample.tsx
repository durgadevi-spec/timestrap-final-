import { useState } from 'react';
import ApprovalCard from '../ApprovalCard';

// todo: remove mock functionality
const mockSubmission = {
  id: '1',
  employeeName: 'Mohanraj C',
  employeeCode: 'EMP041',
  submissionDate: 'December 11, 2025',
  totalHours: 8,
  productiveHours: 6.5,
  idleHours: 1.5,
  status: 'pending' as const,
  tasks: [
    { title: 'Website Development', duration: '3h 30m', tools: ['VS Code', 'Chrome', 'ChatGPT'] },
    { title: 'Team Meeting', duration: '1h', tools: ['MS Teams'] },
    { title: 'Documentation', duration: '2h', tools: ['Notion', 'Word'] },
  ],
};

export default function ApprovalCardExample() {
  const [selected, setSelected] = useState(false);
  
  return (
    <div className="bg-slate-950 min-h-screen p-6">
      <div className="max-w-xl mx-auto">
        <ApprovalCard 
          submission={mockSubmission}
          isSelected={selected}
          onSelect={(_, sel) => setSelected(sel)}
          onApprove={(id) => console.log('Approved:', id)}
          onReject={(id, reason) => console.log('Rejected:', id, reason)}
        />
      </div>
    </div>
  );
}
