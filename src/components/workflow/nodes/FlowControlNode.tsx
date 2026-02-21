// src/components/workflow/nodes/FlowControlNode.tsx
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { NodeContent } from "./NodeContent";
import type { FlowNodeData } from "@/lib/flowUtils";
import { useEditorStore } from "@/stores/editorStore";

function FlowControlNodeComponent({ data, selected }: NodeProps) {
  const {
    workflowNode,
    stepNumber,
    isTerminalNode,
    trueBranchConnected,
    falseBranchConnected,
  } = data as FlowNodeData;
  const nodeType = workflowNode.type;
  const openPicker = useEditorStore((s) => s.openPicker);

  // Only single-output flow control nodes (wait, merge) get the terminal add button.
  const hasSingleOutput = nodeType === "wait" || nodeType === "merge";

  function handleAddAfter(e: React.MouseEvent) {
    e.stopPropagation();
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: "main" });
  }

  function handleAddTrue(e: React.MouseEvent) {
    e.stopPropagation();
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: "true" });
  }

  function handleAddFalse(e: React.MouseEvent) {
    e.stopPropagation();
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: "false" });
  }

  return (
    <>
      {/* Input handles */}
      {nodeType === "merge" ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="branchA"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
            style={{ top: "30%" }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="branchB"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
            style={{ top: "70%" }}
          />
        </>
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          id="main"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />
      )}

      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
      />

      {/* Output handles */}
      {nodeType === "if_condition" && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white"
            style={{ top: "30%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
            style={{ top: "70%" }}
          />
        </>
      )}

      {nodeType === "loop" && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="loopBody"
            className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
            style={{ top: "30%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="loopComplete"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
          />
        </>
      )}

      {(nodeType === "wait" || nodeType === "merge") && (
        <Handle
          type="source"
          position={Position.Right}
          id="main"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />
      )}

      {/* True branch stub — shown when IF node's true handle has no connected edge */}
      {nodeType === "if_condition" && !trueBranchConnected && (
        <div
          className="absolute nodrag nopan"
          style={{
            top: "30%",
            left: "calc(100% + 6px)",
            transform: "translateY(-50%)",
            pointerEvents: "all",
          }}
        >
          <div className="relative flex items-center">
            <div
              style={{
                width: 44,
                height: 2,
                backgroundColor: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span
              className="absolute whitespace-nowrap text-[10px] font-semibold"
              style={{
                color: "#22c55e",
                backgroundColor: "#f0fdf4",
                padding: "1px 6px",
                borderRadius: "9999px",
                bottom: "calc(100% + 2px)",
                left: 6,
              }}
            >
              True
            </span>
            <button
              onClick={handleAddTrue}
              className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
              style={{ borderColor: "#22c55e", flexShrink: 0 }}
              aria-label="Add step on True branch"
            >
              <Plus
                size={12}
                className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
              />
            </button>
          </div>
        </div>
      )}

      {/* False branch stub — shown when IF node's false handle has no connected edge */}
      {nodeType === "if_condition" && !falseBranchConnected && (
        <div
          className="absolute nodrag nopan"
          style={{
            top: "70%",
            left: "calc(100% + 6px)",
            transform: "translateY(-50%)",
            pointerEvents: "all",
          }}
        >
          <div className="relative flex items-center">
            <div
              style={{
                width: 44,
                height: 2,
                backgroundColor: "#94a3b8",
                flexShrink: 0,
              }}
            />
            <span
              className="absolute whitespace-nowrap text-[10px] font-semibold"
              style={{
                color: "#64748b",
                backgroundColor: "#f1f5f9",
                padding: "1px 6px",
                borderRadius: "9999px",
                top: "calc(100% + 2px)",
                left: 6,
              }}
            >
              False
            </span>
            <button
              onClick={handleAddFalse}
              className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
              style={{ borderColor: "#94a3b8", flexShrink: 0 }}
              aria-label="Add step on False branch"
            >
              <Plus
                size={12}
                className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
              />
            </button>
          </div>
        </div>
      )}

      {hasSingleOutput && isTerminalNode && (
        <div
          className="absolute nodrag nopan"
          style={{
            top: "50%",
            left: "calc(100% + 14px)",
            transform: "translateY(-50%)",
            pointerEvents: "all",
          }}
        >
          <button
            onClick={handleAddAfter}
            className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            aria-label="Add step"
          >
            <Plus
              size={12}
              className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
            />
          </button>
        </div>
      )}
    </>
  );
}

export const FlowControlNode = memo(FlowControlNodeComponent);
