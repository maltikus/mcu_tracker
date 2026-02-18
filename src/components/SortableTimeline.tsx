import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import type { LibraryItem } from '../types';
import { cn } from '../lib/utils';

interface Props {
  items: LibraryItem[];
  onReorder: (ids: string[]) => void;
}

const SortableRow = ({ item }: { item: LibraryItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200',
        isDragging && 'opacity-60'
      )}
    >
      <span className="truncate pr-3">#{item.orderIndex} {item.title}</span>
      <button
        type="button"
        aria-label={`Drag ${item.title ?? item.id}`}
        className="cursor-grab rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300"
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
    </li>
  );
};

export const SortableTimeline = ({ items, onReorder }: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex).map((entry) => entry.id);
    onReorder(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2" aria-label="MCU timeline reorder list">
          {items.map((item) => (
            <SortableRow key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
