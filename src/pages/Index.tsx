import { KanbanBoard } from '@/components/kanban/KanbanBoard';

const Index = () => {
  // Default book ID - in a real app this would come from routing or context
  const defaultBookId = 'default-book';
  
  return <KanbanBoard bookId={defaultBookId} />;
};

export default Index;
