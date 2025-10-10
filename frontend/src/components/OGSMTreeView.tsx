import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Trash2, Edit2, GripVertical } from 'lucide-react';
import { OGSMComponent } from '@/types';

interface TreeNode extends OGSMComponent {
  children?: TreeNode[];
  level?: number;
}

interface OGSMTreeViewProps {
  components: OGSMComponent[];
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (component: OGSMComponent) => void;
  onReorder?: (updates: Array<{ id: string; order_index?: number; parent_id?: string | null }>) => void;
}

export default function OGSMTreeView({
  components,
  onDuplicate,
  onDelete,
  onEdit,
  onReorder,
}: OGSMTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' | 'child' } | null>(null);

  // Build tree structure from flat list
  const buildTree = (items: OGSMComponent[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create map of all items
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    // Build tree
    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        const parent = map.get(item.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by order_index
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.order_index - b.order_index);
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    sortNodes(roots);

    return roots;
  };

  const tree = buildTree(components);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNode || draggedNode.id === node.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Determine drop position based on mouse Y position
    let position: 'before' | 'after' | 'child' = 'before';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'child';
    }

    setDropTarget({ id: node.id, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the entire tree area
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNode || !dropTarget || !onReorder) {
      setDraggedNode(null);
      setDropTarget(null);
      return;
    }

    // Prevent dropping on self or descendants
    if (draggedNode.id === targetNode.id || isDescendant(draggedNode, targetNode)) {
      setDraggedNode(null);
      setDropTarget(null);
      return;
    }

    // Calculate new parent and order_index
    let newParentId: string | null = null;
    let newOrderIndex = 0;

    if (dropTarget.position === 'child') {
      newParentId = targetNode.id;
      newOrderIndex = (targetNode.children?.length || 0);
    } else {
      newParentId = targetNode.parent_id || null;
      const siblings = components.filter((c) => c.parent_id === newParentId);
      const targetIndex = siblings.findIndex((s) => s.id === targetNode.id);
      newOrderIndex = dropTarget.position === 'before' ? targetIndex : targetIndex + 1;
    }

    // Build updates array for reordering
    const updates: Array<{ id: string; order_index?: number; parent_id?: string | null }> = [];

    // Update dragged node
    updates.push({
      id: draggedNode.id,
      parent_id: newParentId,
      order_index: newOrderIndex,
    });

    // Update order indices of affected siblings
    const siblings = components.filter(
      (c) => c.parent_id === newParentId && c.id !== draggedNode.id
    );

    siblings.forEach((sibling, index) => {
      const adjustedIndex = index >= newOrderIndex ? index + 1 : index;
      if (sibling.order_index !== adjustedIndex) {
        updates.push({
          id: sibling.id,
          order_index: adjustedIndex,
        });
      }
    });

    onReorder(updates);
    setDraggedNode(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDropTarget(null);
  };

  // Check if node2 is a descendant of node1
  const isDescendant = (node1: TreeNode, node2: TreeNode): boolean => {
    if (node1.id === node2.id) return true;
    if (!node1.children) return false;
    return node1.children.some((child) => isDescendant(child, node2));
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      objective: 'bg-blue-100 text-blue-800 border-blue-300',
      goal: 'bg-green-100 text-green-800 border-green-300',
      strategy: 'bg-purple-100 text-purple-800 border-purple-300',
      measure: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const paddingLeft = level * 24;
    const isDragging = draggedNode?.id === node.id;
    const isDropBefore = dropTarget?.id === node.id && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.id === node.id && dropTarget.position === 'after';
    const isDropChild = dropTarget?.id === node.id && dropTarget.position === 'child';

    return (
      <div key={node.id}>
        {/* Drop indicator before */}
        {isDropBefore && (
          <div
            className="h-0.5 bg-blue-500 mx-3"
            style={{ marginLeft: `${paddingLeft + 8}px` }}
          />
        )}

        <div
          draggable={!!onReorder}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          onDragEnd={handleDragEnd}
          className={`group flex items-center py-2 px-3 border-l-2 transition-colors ${
            isDragging
              ? 'opacity-50 bg-gray-100 border-gray-400'
              : isDropChild
              ? 'bg-blue-50 border-blue-400'
              : 'border-transparent hover:bg-gray-50 hover:border-gray-300'
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpand(node.id)}
            className={`flex-shrink-0 mr-2 p-1 rounded hover:bg-gray-200 transition-colors ${
              !hasChildren ? 'invisible' : ''
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>

          {/* Drag Handle */}
          {onReorder && (
            <div className="flex-shrink-0 mr-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          )}

          {/* Type Badge */}
          <span
            className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded border capitalize ${getTypeColor(
              node.component_type
            )}`}
          >
            {node.component_type}
          </span>

          {/* Title */}
          <div className="flex-1 ml-3">
            <h4 className="text-sm font-semibold text-gray-900">{node.title}</h4>
            {node.description && (
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{node.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(node)}
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit component"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onDuplicate(node.id)}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Duplicate component"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete component"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}

        {/* Drop indicator after */}
        {isDropAfter && (
          <div
            className="h-0.5 bg-blue-500 mx-3"
            style={{ marginLeft: `${paddingLeft + 8}px` }}
          />
        )}
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No components found. Create your first component!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => renderNode(node, 0))}
    </div>
  );
}
